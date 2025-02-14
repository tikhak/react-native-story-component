import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Platform,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
} from 'react-native';

import StoryListItem from './StoryListItem';
import StoryCircleListView from './StoryCircleListView';

import AndroidCubeEffect from '../animations/AndroidCubeEffect';
import CubeNavigationHorizontal from '../animations/CubeNavigationHorizontal';

import { isNullOrWhitespace, isUrl } from '../helpers/ValidationHelpers';
import useMountEffect from '../helpers/useMountEffect';

import { ActionStates } from '../index';
import type {
  UserStory,
  CustomStoryView,
  CustomStoryList,
  CustomProfileBanner,
  CustomStoryImage,
} from '../index';
import type { TextStyle, ViewStyle } from 'react-native';
import type { CubeAnimationHandle } from '../animations';

interface StoryProps {
  data: UserStory[];
  storyListStyle?: ViewStyle;
  unPressedBorderColor?: string;
  pressedBorderColor?: string;
  onClose?: (item: UserStory) => void;
  onStart?: (item: UserStory) => void;
  duration?: number;
  swipeText?: string;
  customSwipeUpButton?: () => React.ReactNode;
  customCloseButton?: () => React.ReactNode;
  customStoryList?: (props: CustomStoryList) => React.ReactNode;
  customStoryView?: (props: CustomStoryView) => React.ReactNode;
  customProfileBanner?: (props: CustomProfileBanner) => React.ReactNode;
  customStoryImage?: (props: CustomStoryImage) => React.ReactNode;
  avatarSize?: number;
  showAvatarText?: boolean;
  showProfileBanner?: boolean;
  avatarTextStyle?: TextStyle;
  prefetchImages?: boolean;
  onImagesPrefetched?: (allImagesPrefethed: boolean) => void;
}

const Story = (props: StoryProps) => {
  const {
    data,
    unPressedBorderColor,
    pressedBorderColor,
    storyListStyle,
    onStart,
    onClose,
    duration,
    swipeText,
    customSwipeUpButton,
    customCloseButton,
    customStoryList,
    customProfileBanner,
    customStoryImage,
    avatarSize,
    showAvatarText,
    showProfileBanner,
    avatarTextStyle,
    prefetchImages,
    onImagesPrefetched,
  } = props;

  const cubeRef = useRef<CubeAnimationHandle>(null);

  const [dataState, setDataState] = useState(data);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedData, setSelectedData] = useState<UserStory[]>([]);

  const _handleStoryItemPress = (item: UserStory, index: number) => {
    const newData = dataState.slice(index);

    if (onStart) onStart(item);

    setCurrentPage(0);
    setSelectedData(newData);
    setIsModalOpen(true);
  };

  const handleSeen = useCallback(() => {
    const seen = selectedData[currentPage] as UserStory;
    const seenIndex = dataState.indexOf(seen);
    if (seenIndex > 0) {
      if (!dataState[seenIndex]?.seen) {
        let tempData = dataState;
        dataState[seenIndex] = {
          ...dataState[seenIndex],
          seen: true,
        } as UserStory;
        setDataState(tempData);
      }
    }
  }, [currentPage, dataState, selectedData]);

  useMountEffect(() => {
    if (prefetchImages) {
      let preFetchTasks: Promise<boolean>[] = [];
      const images = data.flatMap((story) => {
        const storyImages = story.stories.map((storyItem) => {
          return storyItem.image;
        });

        return storyImages;
      });

      images.forEach((image) => {
        preFetchTasks.push(Image.prefetch(image));
      });

      Promise.all(preFetchTasks).then((results) => {
        let downloadedAll = true;

        results.forEach((result) => {
          if (!result) {
            //error occurred downloading a pic
            downloadedAll = false;
          }
        });

        if (onImagesPrefetched) {
          onImagesPrefetched(downloadedAll);
        }
      });
    }
  });

  useEffect(() => {
    handleSeen();
  }, [currentPage, handleSeen]);

  const onStoryFinish = (state: ActionStates) => {
    if (!isNullOrWhitespace(state)) {
      if (state === ActionStates.NEXT) {
        const newPage = currentPage + 1;
        if (newPage < selectedData.length) {
          setCurrentPage(newPage);
          //@ts-ignore
          cubeRef?.current?.scrollTo(newPage);
        } else {
          setIsModalOpen(false);
          setCurrentPage(0);
          if (onClose) {
            onClose(selectedData[selectedData.length - 1] as UserStory);
          }
        }
      } else if (state === ActionStates.PREVIOUS) {
        const newPage = currentPage - 1;
        if (newPage < 0) {
          setIsModalOpen(false);
          setCurrentPage(0);
        } else {
          setCurrentPage(newPage);
          //@ts-ignore
          cubeRef?.current?.scrollTo(newPage);
        }
      }
    }
  };

  const onClosePress = (story: UserStory) => {
    setIsModalOpen(false);
    if (onClose) onClose(story);
  };

  const renderStoryList = () => {
    return selectedData.map((story, i) => {
      if (props.customStoryView)
        return props.customStoryView({
          index: i,
          data: story,
          currentPage,
          changeStory: onStoryFinish,
          close: () => onClosePress(story),
        });

      return (
        <StoryListItem
          key={`story-${story.id}`}
          index={i}
          duration={duration ? duration * 1000 : undefined}
          profileName={story.name}
          profileImage={
            isUrl(story.avatar) ? { uri: story.avatar } : story.avatar
          }
          stories={story.stories}
          currentPage={currentPage}
          onFinish={onStoryFinish}
          swipeText={swipeText}
          customSwipeUpButton={customSwipeUpButton}
          customCloseButton={customCloseButton}
          customProfileBanner={customProfileBanner}
          customStoryImage={customStoryImage}
          showProfileBanner={showProfileBanner}
          onClosePress={() => onClosePress(story)}
        />
      );
    });
  };

  const renderStoryCircleList = () => {
    if (customStoryList) {
      return customStoryList({
        data: dataState,
        onStoryPress: _handleStoryItemPress,
      });
    }

    return (
      <StoryCircleListView
        handleStoryItemPress={_handleStoryItemPress}
        data={dataState}
        avatarSize={avatarSize}
        unPressedBorderColor={unPressedBorderColor}
        pressedBorderColor={pressedBorderColor}
        showText={showAvatarText}
        textStyle={avatarTextStyle}
      />
    );
  };

  const renderCube = () => {
    if (Platform.OS === 'ios') {
      return (
        <CubeNavigationHorizontal
          ref={cubeRef}
          callBackAfterSwipe={(x: string | number) => {
            if (parseInt(`${x}`, 10) !== currentPage) {
              setCurrentPage(parseInt(`${x}`, 10));
            }
          }}
        >
          {renderStoryList()}
        </CubeNavigationHorizontal>
      );
    }

    return (
      <AndroidCubeEffect
        //@ts-ignore
        ref={cubeRef}
        callBackAfterSwipe={(x: string | number) => {
          if (parseInt(`${x}`, 10) !== currentPage) {
            setCurrentPage(parseInt(`${x}`, 10));
          }
        }}
      >
        {renderStoryList()}
      </AndroidCubeEffect>
    );
  };

  return (
    <>
      <View style={storyListStyle}>{renderStoryCircleList()}</View>
      <Modal
        style={styles.modal}
        visible={isModalOpen}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
        transparent={true} 
        statusBarTranslucent
      >
        {renderCube()}
      </Modal>
    </>
  );
};

Story.defaultProps = {
  showAvatarText: true,
  showProfileBanner: true,
  prefetchImages: true,
};

const styles = StyleSheet.create({
  modal: {
    height: Dimensions.get('screen').height,
    width: Dimensions.get('screen').width,
    marginTop:  Platform.OS === 'android' ? -20 : 0, 
  },
});

export default Story;
